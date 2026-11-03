import { createProjectSchema } from "../validations/project.validation.js";

export const validateCreateProject = (req, res, next) => {
    const { error } = createProjectSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({ errors: errorMessages });
    }
    next();
};