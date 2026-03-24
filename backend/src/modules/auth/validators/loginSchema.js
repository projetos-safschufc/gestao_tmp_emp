const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
});

module.exports = { loginSchema };

