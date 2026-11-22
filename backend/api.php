<?php
/* ===== SETTINGS ===== */
$DB_HOST = "localhost";
$DB_NAME = "pesowise";
$DB_USER = "root";
$DB_PASS = "";
$CATEGORIES = ["food", "transport", "school", "fun", "bills", "other"];

/* ===== START ===== */
header("Content-Type: application/json; charset=utf-8");
session_set_cookie_params(["httponly" => true, "samesite" => "Lax", "secure" => !empty($_SERVER["HTTPS"])]);
session_start();

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(["error" => $message]);
    exit;
}
function reply($data) {
    echo json_encode($data);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("POST only.", 405);
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) fail("Bad request.");
$action = $body["action"] ?? "";

try {
    $db = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    fail("Cannot connect to the database.", 500);
}

/* ===== HELPERS ===== */
function goodDate($d) {
    if (!is_string($d)) return false;
    $x = DateTime::createFromFormat("Y-m-d", $d);
    return $x && $x->format("Y-m-d") === $d;
}

function len($text) {
    return preg_match_all("/./su", $text);
}

function cut($text, $max) {
    return implode("", array_slice(preg_split("//u", $text, -1, PREG_SPLIT_NO_EMPTY), 0, $max));
}

function loginRequired() {
    if (empty($_SESSION["user_id"])) fail("Not logged in", 401);
    return (int) $_SESSION["user_id"];
}

function cleanExpense($body, $CATEGORIES) {
    $amount = round((float) ($body["amount"] ?? 0), 2);
    if (!($amount > 0) || $amount > 99999999) fail("Invalid amount.");
    $category = $body["category"] ?? "";
    if (!in_array($category, $CATEGORIES, true)) fail("Invalid category.");
    $date = $body["date"] ?? "";
    if (!goodDate($date)) fail("Invalid date.");
    $note = cut(trim((string) ($body["note"] ?? "")), 40);
    return [$amount, $note, $category, $date];
}

/* ===== ACTIONS ===== */
try {
    switch ($action) {

        case "register":
            $username = trim((string) ($body["username"] ?? ""));
            $fullname = trim((string) ($body["name"] ?? ""));
            $password = (string) ($body["password"] ?? "");
            if ($fullname === "" || len($fullname) > 40) fail("Enter your name (up to 40 characters).");
            if (len($username) < 3 || len($username) > 30) fail("Username must be 3–30 characters.");
            if (strlen($password) < 6) fail("Password must be at least 6 characters.");
            $check = $db->prepare("SELECT id FROM users WHERE username = ?");
            $check->execute([$username]);
            if ($check->fetch()) fail("That username is already taken.");
            $add = $db->prepare("INSERT INTO users (username, fullname, password_hash) VALUES (?, ?, ?)");
            $add->execute([$username, $fullname, password_hash($password, PASSWORD_DEFAULT)]);
            session_regenerate_id(true);
            $_SESSION["user_id"] = (int) $db->lastInsertId();
            reply(["ok" => true]);

        case "login":
            $username = trim((string) ($body["username"] ?? ""));
            $password = (string) ($body["password"] ?? "");
            $find = $db->prepare("SELECT id, password_hash FROM users WHERE username = ?");
            $find->execute([$username]);
            $user = $find->fetch();
            if (!$user || !password_verify($password, $user["password_hash"])) fail("Wrong username or password.");
            session_regenerate_id(true);
            $_SESSION["user_id"] = (int) $user["id"];
            reply(["ok" => true]);

        case "logout":
            $_SESSION = [];
            session_destroy();
            reply(["ok" => true]);

        case "me":
            $id = loginRequired();
            $find = $db->prepare("SELECT username, fullname FROM users WHERE id = ?");
            $find->execute([$id]);
            $user = $find->fetch();
            if (!$user) fail("Not logged in", 401);
            reply(["username" => $user["username"], "name" => $user["fullname"]]);

        case "data":
            $id = loginRequired();
            $find = $db->prepare("SELECT allowance, start_date, end_date FROM users WHERE id = ?");
            $find->execute([$id]);
            $user = $find->fetch();
            $list = $db->prepare("SELECT id, amount, note, category, spent_on FROM expenses WHERE user_id = ? ORDER BY spent_on DESC, id DESC");
            $list->execute([$id]);
            $expenses = [];
            foreach ($list->fetchAll() as $row) {
                $expenses[] = [
                    "id" => (int) $row["id"],
                    "amount" => (float) $row["amount"],
                    "note" => $row["note"],
                    "category" => $row["category"],
                    "date" => $row["spent_on"]
                ];
            }
            reply([
                "allowance" => (float) $user["allowance"],
                "start" => $user["start_date"] ?? "",
                "end" => $user["end_date"] ?? "",
                "expenses" => $expenses
            ]);

        case "add_expense":
            $id = loginRequired();
            list($amount, $note, $category, $date) = cleanExpense($body, $CATEGORIES);
            $add = $db->prepare("INSERT INTO expenses (user_id, amount, note, category, spent_on) VALUES (?, ?, ?, ?, ?)");
            $add->execute([$id, $amount, $note, $category, $date]);
            reply(["id" => (int) $db->lastInsertId()]);

        case "update_expense":
            $id = loginRequired();
            list($amount, $note, $category, $date) = cleanExpense($body, $CATEGORIES);
            $edit = $db->prepare("UPDATE expenses SET amount = ?, note = ?, category = ?, spent_on = ? WHERE id = ? AND user_id = ?");
            $edit->execute([$amount, $note, $category, $date, (int) ($body["id"] ?? 0), $id]);
            reply(["ok" => true]);

        case "delete_expense":
            $id = loginRequired();
            $del = $db->prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?");
            $del->execute([(int) ($body["id"] ?? 0), $id]);
            reply(["ok" => true]);

        case "set_budget":
            $id = loginRequired();
            $amount = round((float) ($body["allowance"] ?? 0), 2);
            $start = $body["start"] ?? "";
            $end = $body["end"] ?? "";
            if (!($amount > 0) || $amount > 99999999 || !goodDate($start) || !goodDate($end)) fail("Invalid allowance or dates.");
            if ($end < $start) fail("The end date must be on or after the start date.");
            $save = $db->prepare("UPDATE users SET allowance = ?, start_date = ?, end_date = ? WHERE id = ?");
            $save->execute([$amount, $start, $end, $id]);
            reply(["ok" => true]);

        default:
            fail("Unknown action.");
    }
} catch (PDOException $e) {
    fail("Database error. Please try again.", 500);
}
