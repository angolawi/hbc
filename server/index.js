const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const client = require('prom-client');
require('dotenv').config();

const app = express();

// Prometheus Metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, code: res.statusCode });
  });
  next();
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database Connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

// Models
const Discipline = sequelize.define('Discipline', {
  id: { type: DataTypes.STRING, primaryKey: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  categoria: { type: DataTypes.STRING },
  currentPhase: { type: DataTypes.INTEGER, defaultValue: 1 }
});

const Topic = sequelize.define('Topic', {
  id: { type: DataTypes.STRING, primaryKey: true },
  texto: { type: DataTypes.TEXT, allowNull: false },
  level: { type: DataTypes.INTEGER, defaultValue: 0 },
  metrics: { type: DataTypes.JSONB } // stores fase1, fase2, fase3
});

const Cycle = sequelize.define('Cycle', {
  id: { type: DataTypes.STRING, primaryKey: true },
  status: { type: DataTypes.STRING, defaultValue: 'active' }, 
  dataCriacao: { type: DataTypes.STRING },
  config: { type: DataTypes.JSONB } 
});

const DashboardInstance = sequelize.define('DashboardInstance', {
  id: { type: DataTypes.STRING, primaryKey: true },
  startDate: { type: DataTypes.STRING },
  disciplines: { type: DataTypes.JSONB }
});

const ProgressCell = sequelize.define('ProgressCell', {
  key: { type: DataTypes.STRING, primaryKey: true }, // e.g. "Portugues_2023-10-01"
  status: { type: DataTypes.STRING }
});

const GlobalConfig = sequelize.define('GlobalConfig', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT }
});

Discipline.hasMany(Topic, { as: 'topicos', foreignKey: 'disciplineId', onDelete: 'CASCADE' });
Topic.belongsTo(Discipline, { foreignKey: 'disciplineId' });

// Initialize Database
sequelize.sync({ alter: true }).then(() => {
  console.log('PostgreSQL Database connected & synced');
});

// API Routes
app.get('/api/edital', async (req, res) => {
  try {
    const disciplines = await Discipline.findAll({
      include: [{ model: Topic, as: 'topicos' }],
      order: [['createdAt', 'ASC'], [{ model: Topic, as: 'topicos' }, 'createdAt', 'ASC']]
    });
    res.json(disciplines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/edital', async (req, res) => {
  try {
    const { id, nome, categoria, currentPhase, topicos } = req.body;
    const [discipline, created] = await Discipline.upsert({ id, nome, categoria, currentPhase });
    
    if (topicos && topicos.length > 0) {
      // Clean old topics for this discipline first to avoid duplicates
      await Topic.destroy({ where: { disciplineId: id } });
      const topicsWithMetrics = topicos.map(t => ({
        ...t,
        disciplineId: id,
        metrics: { fase1: t.fase1, fase2: t.fase2, fase3: t.fase3 }
      }));
      await Topic.bulkCreate(topicsWithMetrics);
    }
    
    res.status(201).json(discipline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/edital/sync', async (req, res) => {
    try {
        const fullEdital = req.body; // Array of disciplines
        // This is a naive implementation: clear all and recreate
        // In real world, we would use transactions and find/update logic
        await Discipline.destroy({ where: {}, truncate: true, cascade: true });
        for (const disc of fullEdital) {
            const d = await Discipline.create({ 
                id: disc.id, 
                nome: disc.nome, 
                categoria: disc.categoria, 
                currentPhase: disc.currentPhase 
            });
            if (disc.topicos) {
                const topics = disc.topicos.map(t => ({
                    ...t,
                    disciplineId: d.id,
                    metrics: { fase1: t.fase1, fase2: t.fase2, fase3: t.fase3 }
                }));
                await Topic.bulkCreate(topics);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cycles API
app.get('/api/cycles', async (req, res) => {
  try {
    const cycles = await Cycle.findAll({ order: [['createdAt', 'DESC']] });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cycles/sync', async (req, res) => {
  try {
    const { cycles } = req.body;
    await Cycle.destroy({ where: {}, truncate: true });
    await Cycle.bulkCreate(cycles.map(c => ({
        id: c.id,
        status: c.status,
        dataCriacao: c.dataCriacao,
        config: c
    })));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard API
app.get('/api/dashboard/instances', async (req, res) => {
    try { res.json(await DashboardInstance.findAll()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dashboard/instances', async (req, res) => {
    try { res.json(await DashboardInstance.create(req.body)); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/progress', async (req, res) => {
    try { res.json(await ProgressCell.findAll()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dashboard/progress/sync', async (req, res) => {
    try {
        const { progress } = req.body; // array of {key, status}
        await ProgressCell.destroy({ where: {}, truncate: true });
        await ProgressCell.bulkCreate(progress);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Config API
app.get('/api/config/:key', async (req, res) => {
    try {
        const item = await GlobalConfig.findByPk(req.params.key);
        res.json(item ? item.value : null);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/config', async (req, res) => {
    try {
        const { key, value } = req.body;
        await GlobalConfig.upsert({ key, value: value.toString() });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/edital/:id', async (req, res) => {
  try {
    await Discipline.destroy({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
