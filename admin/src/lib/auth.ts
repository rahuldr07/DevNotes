import Cookies from 'js-cookie';

export function saveToken(token: string) {
    Cookies.set("auth_token",token);
}

export function getToken():string | undefined {
    return Cookies.get("auth_token");
}

export function removeToken() {
    Cookies.remove("auth_token");
}

export function isAuthenticated(): boolean {
    return !!getToken();
}