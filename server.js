import express from "express";

const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const DATA_FILE_PATH = process.env.DATA_FILE_PATH || "datos.json";
const PORT = process.env.PORT || 3000;

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
  console.error("Faltan variables de entorno requeridas.");
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

async function getRepoFile() {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    method: "GET",
    headers: githubHeaders()
  });

  if (res.status === 404) {
    return { items: [], sha: null };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error leyendo ${DATA_FILE_PATH}: ${res.status} ${text}`);
  }

  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf8");
  const parsed = JSON.parse(decoded || "[]");

  return {
    items: Array.isArray(parsed) ? parsed : [],
    sha: data.sha
  };
}

async function saveRepoFile(items, sha, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
  const contentBase64 = Buffer.from(JSON.stringify(items, null, 2), "utf8").toString("base64");

  const body = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH
  };

  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error guardando ${DATA_FILE_PATH}: ${res.status} ${text}`);
  }

  return res.json();
}

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Backend activo" });
});

app.get("/lecturas", async (_req, res) => {
  try {
    const { items } = await getRepoFile();
    res.json({ ok: true, lecturas: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/guardar", async (req, res) => {
  try {
    const lectura = req.body;

    if (
      !lectura ||
      !lectura.date ||
      !["dia", "noche"].includes(lectura.time_slot) ||
      !Number.isFinite(Number(lectura.systolic)) ||
      !Number.isFinite(Number(lectura.diastolic))
    ) {
      return res.status(400).json({ ok: false, error: "Datos inválidos" });
    }

    const nuevaLectura = {
      id: lectura.id || Date.now(),
      date: lectura.date,
      time_slot: lectura.time_slot,
      systolic: Number(lectura.systolic),
      diastolic: Number(lectura.diastolic),
      created_at: lectura.created_at || new Date().toISOString()
    };

    const { items, sha } = await getRepoFile();
    items.push(nuevaLectura);

    await saveRepoFile(items, sha, `Agregar lectura ${nuevaLectura.date} ${nuevaLectura.time_slot}`);

    res.json({ ok: true, lectura: nuevaLectura });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete("/lecturas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { items, sha } = await getRepoFile();
    const next = items.filter((x) => Number(x.id) !== id);

    if (next.length === items.length) {
      return res.status(404).json({ ok: false, error: "No encontrada" });
    }

    await saveRepoFile(next, sha, `Eliminar lectura ${id}`);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
