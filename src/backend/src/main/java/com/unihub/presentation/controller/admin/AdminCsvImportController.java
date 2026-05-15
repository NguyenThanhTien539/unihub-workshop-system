package com.unihub.presentation.controller.admin;

import com.unihub.application.csvimport.CsvImportQueryService;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportBatchResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportBatchSummaryResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportErrorResponse;
import com.unihub.presentation.mapper.csvimport.CsvImportResponseMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/csv-imports")
public class AdminCsvImportController {
  private final CsvImportQueryService csvImportQueryService;
  private final CsvImportResponseMapper csvImportResponseMapper;

  public AdminCsvImportController(
      CsvImportQueryService csvImportQueryService,
      CsvImportResponseMapper csvImportResponseMapper) {
    this.csvImportQueryService = csvImportQueryService;
    this.csvImportResponseMapper = csvImportResponseMapper;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<CsvImportBatchSummaryResponse>>> listBatches(
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    List<CsvImportBatchSummaryResponse> responses = csvImportQueryService.listBatches(page, size).stream()
        .map(csvImportResponseMapper::toBatchSummaryResponse)
        .toList();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/{batchId}")
  public ResponseEntity<ApiResponse<CsvImportBatchResponse>> getBatch(@PathVariable UUID batchId) {
    CsvImportBatchResponse response = csvImportResponseMapper.toBatchResponse(
        csvImportQueryService.getBatch(batchId));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @GetMapping("/{batchId}/errors")
  public ResponseEntity<ApiResponse<List<CsvImportErrorResponse>>> getBatchErrors(@PathVariable UUID batchId) {
    List<CsvImportErrorResponse> responses = csvImportQueryService.getBatchErrors(batchId).stream()
        .map(csvImportResponseMapper::toErrorResponse)
        .toList();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
