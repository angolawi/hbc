const API_URL = '/api'; // Handled by Nginx proxy in production

export const editalService = {
  getDisciplines: async () => {
    const res = await fetch(`${API_URL}/edital`);
    if (!res.ok) throw new Error('Falha ao bauxar edital');
    const data = await res.json();
    // Map back metrics if necessary
    return data.map(d => ({
      ...d,
      topicos: d.topicos.map(t => ({
        ...t,
        ...t.metrics
      }))
    }));
  },

  saveDiscipline: async (discipline) => {
    const res = await fetch(`${API_URL}/edital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discipline)
    });
    return res.json();
  },

  syncEdital: async (disciplines) => {
    await fetch(`${API_URL}/edital/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(disciplines)
    });
  },

  deleteDiscipline: async (id) => {
    await fetch(`${API_URL}/edital/${id}`, { method: 'DELETE' });
  }
};

export const cycleService = {
  getCycles: async () => {
    const res = await fetch(`${API_URL}/cycles`);
    if (!res.ok) throw new Error('Falha ao baixar ciclos');
    const data = await res.json();
    return data.map(c => c.config); // Extract the full config object
  },

  syncCycles: async (cycles) => {
    await fetch(`${API_URL}/cycles/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycles })
    });
  }
};

export const dashboardService = {
    getInstances: async () => {
        const res = await fetch(`${API_URL}/dashboard/instances`);
        return await res.json();
    },
    saveInstance: async (inst) => {
        const res = await fetch(`${API_URL}/dashboard/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inst)
        });
        return await res.json();
    },
    getProgress: async () => {
        const res = await fetch(`${API_URL}/dashboard/progress`);
        const data = await res.json();
        // Convert array back to object for frontend ease of use
        const obj = {};
        data.forEach(item => { obj[item.key] = item.status; });
        return obj;
    },
    syncProgress: async (progressObj) => {
        const array = Object.entries(progressObj).map(([key, status]) => ({ key, status }));
        await fetch(`${API_URL}/dashboard/progress/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: array })
        });
    }
};
