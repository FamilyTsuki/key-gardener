const MESSAGES = {
    ALL_FIELDS_REQUIRED: "All fields are required",
    PASSWORD_TOO_SHORT: "Password must be at least 6 characters",
    EMAIL_ALREADY_REGISTERED: "Email already registered",
    USERNAME_ALREADY_TAKEN: "Username already taken",
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_PASSWORD_REQUIRED: "Email and password are required",

    CONTENT_REQUIRED: "Content is required",
    POST_NOT_FOUND: "Post not found",
    POST_DELETED: "Post deleted",

    NO_TOKEN_PROVIDED: "No token provided.",
    UNAUTHORIZED: "Unauthorized.",
    USER_NOT_FOUND: "User not found.",
    SERVER_ERROR: "Server error.",

    REGISTRATION_SUCCESS: "Registration successful",
    LOGIN_SUCCESS: "Login successful",
    POST_CREATED: "Post created successfully",
    POST_UPDATED: "Post updated successfully",
};

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SERVER_ERROR: 500,
};

module.exports = {
    MESSAGES,
    HTTP_STATUS,
};
