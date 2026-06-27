const Joi = require('joi');
const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, ''),
    }));
    return ApiResponse.badRequest(res, 'Validation failed', errors);
  }
  next();
};

// Auth schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Progress schema
const progressSchema = Joi.object({
  problemId: Joi.string().required(),
  status: Joi.string().valid('not_started', 'solved', 'revision', 'scheduled', 'favorite'),
  isFavorite: Joi.boolean(),
  notes: Joi.string().max(2000).allow(''),
  scheduledFor: Joi.date().allow(null),
  timeSpent: Joi.number().min(0),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  progressSchema,
};
