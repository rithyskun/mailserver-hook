<template>
  <div class="container">
    <div class="content">
      <h1>Email Web Server Hook</h1>
      <p>{{ status }}</p>
      <div class="info">
        <p><strong>API Documentation:</strong></p>
        <ul>
          <li><code>POST /api/email/send</code> - Send an email</li>
          <li><code>POST /api/email/batch</code> - Send batch emails</li>
          <li><code>GET /api/health</code> - Health check</li>
          <li><code>GET /api/stats</code> - API statistics</li>
          <li><code>GET /api/logs</code> - View logs</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const status = ref('Email server is running')
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: system-ui, -apple-system, sans-serif;
}

.content {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 600px;
}

h1 {
  color: #667eea;
  margin: 0 0 20px 0;
}

p {
  color: #666;
  font-size: 16px;
  margin: 10px 0;
}

.info {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #eee;
}

.info strong {
  color: #333;
}

.info ul {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.info li {
  padding: 8px 0;
  color: #666;
}

.info code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d63384;
}
</style>
