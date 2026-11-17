/**
 * Masuk memakai NAMA + kata sandi, bukan email.
 * Supabase Auth butuh email, jadi nama dipetakan ke alamat internal yang tidak pernah dikirimi surat.
 * Contoh: "Sadiva" -> sadiva@login.ina21.app
 */
export const LOGIN_DOMAIN = 'login.ina21.app';

export const loginName = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export const loginEmail = (name: string) => `${loginName(name)}@${LOGIN_DOMAIN}`;
