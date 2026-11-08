<?php
require_once __DIR__.'/names.php';
function familyDatabase(): PDO {
    $config = require __DIR__ . '/config.local.php';
    $dsn = !empty($config['socket'])
        ? 'mysql:unix_socket=' . $config['socket'] . ';charset=utf8mb4'
        : 'mysql:host=' . $config['host'] . ';port=' . $config['port'] . ';charset=utf8mb4';
    $db = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $name = getenv('KINFOLK_DB_DATABASE') ?: $config['database'];
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) throw new RuntimeException('Invalid database name.');
    $db->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->exec("USE `$name`");
    $db->exec("CREATE TABLE IF NOT EXISTS family_people (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        photo MEDIUMTEXT NOT NULL,
        bio TEXT NOT NULL,
        birthday DATE NULL,
        location VARCHAR(255) NOT NULL,
        display_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS family_relationships (
        person_a VARCHAR(64) NOT NULL,
        person_b VARCHAR(64) NOT NULL,
        relationship_type ENUM('parent','child','sibling','spouse') NOT NULL,
        PRIMARY KEY (person_a, person_b),
        FOREIGN KEY (person_a) REFERENCES family_people(id) ON DELETE CASCADE,
        FOREIGN KEY (person_b) REFERENCES family_people(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS family_state (
        id TINYINT PRIMARY KEY,
        revision BIGINT NOT NULL DEFAULT 0,
        request_email VARCHAR(254) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB");
    $db->exec("INSERT IGNORE INTO family_state (id) VALUES (1)");
    $db->exec("CREATE TABLE IF NOT EXISTS family_milestones (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        event_date DATE NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        participants MEDIUMTEXT NOT NULL,
        photos MEDIUMTEXT NULL
    ) ENGINE=InnoDB");
    $type = $db->query("SHOW COLUMNS FROM family_milestones LIKE 'event_type'")->fetch();
    if (strtolower($type['Type']) !== 'varchar(32)') $db->exec("ALTER TABLE family_milestones MODIFY event_type VARCHAR(32) NOT NULL");
    if (!$db->query("SHOW COLUMNS FROM family_milestones LIKE 'photos'")->fetch()) $db->exec("ALTER TABLE family_milestones ADD photos MEDIUMTEXT NULL");
    $db->exec("CREATE TABLE IF NOT EXISTS family_person_aliases (old_id VARCHAR(64) PRIMARY KEY, person_id VARCHAR(64) NOT NULL) ENGINE=InnoDB");
    foreach(['first_name','middle_name','last_name'] as $column)if(!$db->query("SHOW COLUMNS FROM family_people LIKE '$column'")->fetch())$db->exec("ALTER TABLE family_people ADD $column VARCHAR(120) NOT NULL DEFAULT ''");
    $update=$db->prepare("UPDATE family_people SET first_name=?,middle_name=?,last_name=? WHERE id=? AND first_name=''");
    foreach($db->query("SELECT id,name FROM family_people WHERE first_name='' ")->fetchAll() as $p){$n=splitPersonName($p['name']);$update->execute([$n['firstName'],$n['middleName'],$n['lastName'],$p['id']]);}
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'location_place_id'")->fetch())$db->exec("ALTER TABLE family_people ADD location_place_id VARCHAR(255) NOT NULL DEFAULT ''");
    foreach(['location_lat'=>'DECIMAL(10,7)','location_lng'=>'DECIMAL(10,7)'] as $column=>$type)if(!$db->query("SHOW COLUMNS FROM family_people LIKE '$column'")->fetch())$db->exec("ALTER TABLE family_people ADD $column $type NULL");
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'location_history'")->fetch())$db->exec("ALTER TABLE family_people ADD location_history MEDIUMTEXT NULL");
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'birthplace'")->fetch())$db->exec("ALTER TABLE family_people ADD birthplace TEXT NULL");
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'nicknames'")->fetch())$db->exec("ALTER TABLE family_people ADD nicknames TEXT NULL");
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'date_details'")->fetch())$db->exec("ALTER TABLE family_people ADD date_details TEXT NULL");
    if(!$db->query("SHOW COLUMNS FROM family_people LIKE 'deceased'")->fetch())$db->exec("ALTER TABLE family_people ADD deceased TINYINT(1) NOT NULL DEFAULT 0");
    require_once __DIR__.'/media.php';
    initializeFamilyMedia($db);
    require_once __DIR__.'/albums.php';
    initializeFamilyAlbums($db);
    require_once __DIR__.'/recipes.php';
    initializeFamilyRecipes($db);
    require_once __DIR__.'/family-groups.php';
    initializeFamilyGroups($db);
    require_once __DIR__.'/photo-tags.php';
    initializePhotoTags($db);
    return $db;
}
