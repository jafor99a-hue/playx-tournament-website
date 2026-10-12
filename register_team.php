<?php
include 'db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $team_name = $_POST['team_name'];
    $player1_uid = $_POST['player1_uid'];
    $player2_uid = $_POST['player2_uid'];
    $player3_uid = $_POST['player3_uid'];
    $player4_uid = $_POST['player4_uid'];

    $sql = "INSERT INTO tournament_registrations (team_name, player1_uid, player2_uid, player3_uid, player4_uid) 
            VALUES ('$team_name', '$player1_uid', '$player2_uid', '$player3_uid', '$player4_uid')";

    if ($conn->query($sql) === TRUE) {
        echo "রেজিস্ট্রেশন সফল হয়েছে!";
    } else {
        echo "ভুল হয়েছে: " . $conn->error;
    }
}
?>