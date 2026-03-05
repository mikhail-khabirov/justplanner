import { safeLocalStorage } from './utils';

const API_URL = '/api';

export class AuthError extends Error {
    constructor() {
        super('Unauthorized');
        this.name = 'AuthError';
    }
}

const getAuthHeaders = () => {
    const token = safeLocalStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const tasksApi = {
    // Get all tasks for current user
    async getAll() {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new AuthError();
            }
            throw new Error('Failed to fetch tasks');
        }

        return response.json();
    },

    // Create a new task
    async create(task: any) {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new AuthError();
            }
            throw new Error('Failed to create task');
        }

        return response.json();
    },

    // Update a task
    async update(id: string, updates: any) {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new AuthError();
            }
            throw new Error('Failed to update task');
        }

        return response.json();
    },

    // Delete a task
    async delete(id: string) {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new AuthError();
            }
            throw new Error('Failed to delete task');
        }

        return response.json();
    },

    // Sync all tasks (full replace)
    async syncAll(tasks: any[]) {
        const response = await fetch(`${API_URL}/tasks/sync`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tasks })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new AuthError();
            }
            throw new Error('Failed to sync tasks');
        }

        return response.json();
    }
};

export const telegramApi = {
    async getStatus() {
        const response = await fetch(`${API_URL}/settings/telegram/status`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new AuthError();
            throw new Error('Failed to get telegram status');
        }
        return response.json();
    },

    async getLink() {
        const response = await fetch(`${API_URL}/settings/telegram/link`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new AuthError();
            throw new Error('Failed to get telegram link');
        }
        return response.json();
    },

    async unlink() {
        const response = await fetch(`${API_URL}/settings/telegram/unlink`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new AuthError();
            throw new Error('Failed to unlink telegram');
        }
        return response.json();
    }
};
