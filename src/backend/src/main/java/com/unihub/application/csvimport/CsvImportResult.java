package com.unihub.application.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;

public record CsvImportResult(
    CsvImportBatch batch,
    boolean skipped,
    String message) {
}
