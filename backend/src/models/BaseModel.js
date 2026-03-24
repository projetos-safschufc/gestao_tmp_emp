class BaseModel {
  constructor({ pool } = {}) {
    if (!pool) {
      throw new Error('BaseModel requer { pool }');
    }
    this.pool = pool;
  }

  async query(queryText, params) {
    return this.pool.query(queryText, params);
  }

  // Transação genérica usando conexão do pool.
  async withTransaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = BaseModel;

