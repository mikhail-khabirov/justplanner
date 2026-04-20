module.exports = {
    apps: [{
        name: 'justplanner-api',
        script: 'index.js',
        cwd: '/var/www/justplanner/server',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production'
        }
    }]
};
