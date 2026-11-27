<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health', function () {
    try {
        DB::select('SELECT 1');

        return response()->json(['status' => 'ok', 'db' => 'up']);
    } catch (\Throwable $e) {
        report($e); // ghi lỗi kèm stack trace vào storage/logs/laravel.log

        return response()->json(['status' => 'error', 'db' => 'down'], 500);
    }
});

Route::get('/version', function () {
    return response()->json(
        json_decode(file_get_contents(base_path('version.json')), true)
    );
});
