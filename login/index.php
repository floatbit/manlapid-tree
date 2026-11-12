<?php
require_once __DIR__.'/../server/auth.php';
startFamilySession();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Content-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; form-action \'self\'; base-uri \'none\'; frame-ancestors \'none\'');
$error='';
$script=$_SERVER['SCRIPT_NAME']??'/login/index.php';
$base=str_contains($script,'/login/')?substr($script,0,strpos($script,'/login/')):'';
$home=$base.'/';
if($_SERVER['REQUEST_METHOD']==='POST'){
    if(!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??''))) {http_response_code(403);$error='Please reload before trying again.';}
    elseif(isset($_POST['logout'])){$_SESSION['family_editor']=false;$_SESSION['csrf']=bin2hex(random_bytes(24));session_regenerate_id(true);header('Location: '.$home, true,303);exit;}
    elseif(time()<($_SESSION['login_retry_after']??0)){http_response_code(429);$error='Too many attempts. Please try again in a minute.';}
    elseif(familyPasswordMatches(is_string($_POST['password']??null)?$_POST['password']:'')){
        session_regenerate_id(true);$_SESSION['family_editor']=true;$_SESSION['csrf']=bin2hex(random_bytes(24));unset($_SESSION['login_failures'],$_SESSION['login_retry_after']);header('Location: '.$home.'?select-me=1',true,303);exit;
    }else{$_SESSION['login_failures']=($_SESSION['login_failures']??0)+1;if($_SESSION['login_failures']>=5)$_SESSION['login_retry_after']=time()+60;http_response_code(401);$error='Incorrect password.';}
}
$loggedIn=familyCanEdit();$token=htmlspecialchars($_SESSION['csrf'],ENT_QUOTES);session_write_close();
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Family Login</title>
<style>*{box-sizing:border-box}body{margin:0;background:#faf9f5;color:#263c36;font:16px system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:420px;background:white;border:1px solid #e3e6dd;border-radius:16px;padding:32px;position:relative}h1{font-size:28px}label{display:block;margin:24px 0 8px}input,button{font:inherit;width:100%;border:1px solid #cdd5c9;border-radius:8px;padding:12px}button{margin-top:18px;background:#38634e;color:white;cursor:pointer}a{color:#38634e}.close{position:absolute;right:18px;top:14px;text-decoration:none;font-size:26px}p{line-height:1.5}.error{color:#a52b2b}</style></head><body><main><a class="close" href="<?=htmlspecialchars($home,ENT_QUOTES)?>" aria-label="Close login">×</a><h1><?=$loggedIn?'Editing Enabled':'Log In to Edit'?></h1><p><?=$loggedIn?'You can add and update your family’s information.':'Enter the password to add, edit, or delete family information.'?></p><form method="post"><input type="hidden" name="csrf" value="<?=$token?>"><?php if(!$loggedIn):?><label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required autofocus><button type="submit">Log In</button><?php else:?><button type="submit" name="logout" value="1">Log Out</button><?php endif;?></form><?php if($error):?><p class="error" role="alert"><?=htmlspecialchars($error,ENT_QUOTES)?></p><?php endif;?></main></body></html>
