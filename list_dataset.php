<?php
// File: list_dataset.php (di folder utama)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$response = [
    'status' => 'error',
    'data' => [],
    'debug' => [
        'error' => 'An unknown error occurred.'
    ]
];

try {
    $datasetDirectory = __DIR__ . '/dataset';

    // Menormalkan path untuk konsistensi
    $datasetDirectory = str_replace('/', DIRECTORY_SEPARATOR, $datasetDirectory);
    
    $response['debug']['calculatedPath'] = $datasetDirectory;

    if (is_dir($datasetDirectory) && is_readable($datasetDirectory)) {
        $response['debug']['directoryStatus'] = 'Found and readable.';
        
        $files = scandir($datasetDirectory);
        $groupedFiles = [];

        foreach ($files as $file) {
            if (preg_match('/\.(jpg|jpeg|png)$/i', $file)) {
                $parts = explode('_', $file);
                $label = trim($parts[0]);
                if ($label) {
                    if (!isset($groupedFiles[$label])) {
                        $groupedFiles[$label] = [];
                    }
                    $groupedFiles[$label][] = $file;
                }
            }
        }
        
        $response['status'] = 'success';
        $response['data'] = $groupedFiles;
        unset($response['debug']['error']);

    } else {
        $response['debug']['error'] = 'Direktori tidak ditemukan atau tidak bisa dibaca di path yang dihitung.';
        $response['debug']['realpathResult'] = realpath($datasetDirectory);
    }

} catch (Exception $e) {
    $response['debug']['error'] = 'PHP Exception: ' . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>