import pool from '../config/db.js';

export const Task = {
    // Get all tasks for user
    async findByUserId(userId) {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at',
            [userId]
        );
        return result.rows.map(row => ({
            id: row.id.toString(),
            content: row.content,
            columnId: row.column_id,
            hour: row.hour,
            color: row.color,
            completed: row.completed,
            subtasks: row.subtasks || [],
            recurrence: row.recurrence_type ? {
                type: row.recurrence_type,
                interval: row.recurrence_interval || 1,
                endDate: row.recurrence_end_date
            } : undefined,
            reminderOffset: row.reminder_offset || null
        }));
    },

    // Create task
    async create(userId, task) {
        await pool.query('UPDATE users SET no_task_reminder_sent = FALSE WHERE id = $1', [userId]);
        const result = await pool.query(
            `INSERT INTO tasks (user_id, content, column_id, hour, color, completed, subtasks, recurrence_type, recurrence_interval, recurrence_end_date, reminder_offset, reminder_sent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE) 
       RETURNING *`,
            [
                userId,
                task.content,
                task.columnId,
                task.hour,
                task.color,
                task.completed,
                JSON.stringify(task.subtasks || []),
                task.recurrence?.type || null,
                task.recurrence?.interval || 1,
                task.recurrence?.endDate || null,
                task.reminderOffset || null
            ]
        );
        const row = result.rows[0];
        return {
            id: row.id.toString(),
            content: row.content,
            columnId: row.column_id,
            hour: row.hour,
            color: row.color,
            completed: row.completed,
            subtasks: row.subtasks || [],
            recurrence: row.recurrence_type ? {
                type: row.recurrence_type,
                interval: row.recurrence_interval || 1,
                endDate: row.recurrence_end_date
            } : undefined,
            reminderOffset: row.reminder_offset || null
        };
    },

    // Update task
    async update(id, userId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.content !== undefined) {
            fields.push(`content = $${paramIndex++}`);
            values.push(updates.content);
        }
        if (updates.columnId !== undefined) {
            fields.push(`column_id = $${paramIndex++}`);
            values.push(updates.columnId);
        }
        if (updates.hour !== undefined) {
            fields.push(`hour = $${paramIndex++}`);
            values.push(updates.hour);
        }
        if (updates.color !== undefined) {
            fields.push(`color = $${paramIndex++}`);
            values.push(updates.color);
        }
        if (updates.completed !== undefined) {
            fields.push(`completed = $${paramIndex++}`);
            values.push(updates.completed);
        }
        if (updates.subtasks !== undefined) {
            fields.push(`subtasks = $${paramIndex++}`);
            values.push(JSON.stringify(updates.subtasks));
        }
        if (updates.recurrence !== undefined) {
            if (updates.recurrence === null) {
                fields.push(`recurrence_type = $${paramIndex++}`);
                values.push(null);
                fields.push(`recurrence_interval = $${paramIndex++}`);
                values.push(1);
                fields.push(`recurrence_end_date = $${paramIndex++}`);
                values.push(null);
            } else {
                fields.push(`recurrence_type = $${paramIndex++}`);
                values.push(updates.recurrence.type);
                fields.push(`recurrence_interval = $${paramIndex++}`);
                values.push(updates.recurrence.interval || 1);
                fields.push(`recurrence_end_date = $${paramIndex++}`);
                values.push(updates.recurrence.endDate || null);
            }
        }
        if (updates.reminderOffset !== undefined) {
            fields.push(`reminder_offset = $${paramIndex++}`);
            values.push(updates.reminderOffset || null);
            // Reset reminder_sent when offset changes
            fields.push(`reminder_sent = $${paramIndex++}`);
            values.push(false);
        }

        if (fields.length === 0) {
            return null;
        }

        values.push(id, userId);
        const result = await pool.query(
            `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
            values
        );

        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            id: row.id.toString(),
            content: row.content,
            columnId: row.column_id,
            hour: row.hour,
            color: row.color,
            completed: row.completed,
            subtasks: row.subtasks || [],
            recurrence: row.recurrence_type ? {
                type: row.recurrence_type,
                interval: row.recurrence_interval || 1,
                endDate: row.recurrence_end_date
            } : undefined,
            reminderOffset: row.reminder_offset || null
        };
    },

    // Delete task
    async delete(id, userId) {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rows[0] ? true : false;
    },

    // Delete tasks by column IDs (batch delete for clearing days/weeks)
    async deleteByColumnIds(userId, columnIds) {
        if (!columnIds || columnIds.length === 0) return 0;

        const result = await pool.query(
            'DELETE FROM tasks WHERE user_id = $1 AND column_id = ANY($2) RETURNING id',
            [userId, columnIds]
        );
        return result.rowCount;
    },

    // Sync all tasks (replace all user tasks)
    async syncAll(userId, tasks) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete all existing tasks
            await client.query('DELETE FROM tasks WHERE user_id = $1', [userId]);

            // Insert all new tasks
            for (const task of tasks) {
                await client.query(
                    `INSERT INTO tasks (user_id, content, column_id, hour, color, completed, subtasks, recurrence_type, recurrence_interval, recurrence_end_date, reminder_offset, reminder_sent) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        userId,
                        task.content,
                        task.columnId,
                        task.hour,
                        task.color,
                        task.completed,
                        JSON.stringify(task.subtasks || []),
                        task.recurrence?.type || null,
                        task.recurrence?.interval || 1,
                        task.recurrence?.endDate || null,
                        task.reminderOffset || null,
                        task.reminderOffset ? false : false
                    ]
                );
            }

            await client.query('COMMIT');
            return true;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
};
