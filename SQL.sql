CREATE DATABASE playx_db;

USE playx_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tournament_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    player1_uid VARCHAR(20) NOT NULL,
    player2_uid VARCHAR(20),
    player3_uid VARCHAR(20),
    player4_uid VARCHAR(20),
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);