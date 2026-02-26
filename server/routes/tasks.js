import express from 'express';
import { Task } from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.findByUserId(req.user.id);
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Ошибка при получении задач' });
    }
});

// Create task
router.post('/', async (req, res) => {
    try {
        const task = await Task.create(req.user.id, req.body);
        res.json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Ошибка при создании задачи' });
    }
});

// Update task
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.update(req.params.id, req.user.id, req.body);
        if (!task) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        res.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении задачи' });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Task.delete(req.params.id, req.user.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Ошибка при удалении задачи' });
    }
});

// Batch delete tasks (by column IDs)
router.post('/batch-delete', async (req, res) => {
    try {
        const { columnIds } = req.body;
        if (!Array.isArray(columnIds)) {
            return res.status(400).json({ error: 'Неверный формат данных' });
        }

        const count = await Task.deleteByColumnIds(req.user.id, columnIds);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Batch delete error:', error);
        res.status(500).json({ error: 'Ошибка при удалении задач' });
    }
});

// Sync all tasks (full replace)
router.post('/sync', async (req, res) => {
    try {
        const tasks = req.body.tasks;
        if (!Array.isArray(tasks)) {
            console.warn(`⚠️ Sync: user ${req.user.id} sent non-array tasks:`, typeof tasks);
            return res.status(400).json({ error: 'tasks must be an array' });
        }

        // Protect against accidental wipe: if client sends 0 tasks but user has existing tasks
        if (tasks.length === 0) {
            const existing = await Task.findByUserId(req.user.id);
            if (existing.length > 0) {
                console.warn(`⚠️ Sync blocked: user ${req.user.id} tried to sync 0 tasks (had ${existing.length})`);
                return res.json({ success: true, warning: 'empty sync ignored' });
            }
        }

        console.log(`📋 Sync: user ${req.user.id}, ${tasks.length} tasks`);
        await Task.syncAll(req.user.id, tasks);
        res.json({ success: true });
    } catch (error) {
        console.error('Sync tasks error:', error);
        res.status(500).json({ error: 'Ошибка при синхронизации задач' });
    }
});

export default router;
