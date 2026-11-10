<?php
declare(strict_types=1);
function startFamilySession(): void {
    if(session_status()===PHP_SESSION_ACTIVE)return;
    ini_set('session.use_strict_mode','1');
    session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off']);
    session_start();
    if(empty($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(24));
}
function familyCanEdit(): bool {return !empty($_SESSION['family_editor']);}
function familyPasswordMatches(string $password): bool {
    return password_verify($password, getenv('KINFOLK_EDITOR_PASSWORD_HASH') ?: '$2y$10$yz.2ceCoLi1U8doFuMaVQub20bD/8.XN6lcPnuIpcjwLAFSVejrJG');
}
