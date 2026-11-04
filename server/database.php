<?php
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
    return $db;
}
