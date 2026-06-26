export class ValidationUtils {
    static validatePassword(password) {
        const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        return regex.test(password);
    }
}
