# Feature Spec: AI Summary from Workshop PDFs

## Description

This feature lets organizers upload workshop PDF documents and automatically generate a summary for the workshop detail page. The workflow includes upload, text extraction, cleanup, AI summarization, status tracking, and failure recovery.

## Main Flow

1. Organizer uploads a PDF from the admin interface.
2. Backend stores the file in object storage and creates a `workshop_document` record.
3. Backend queues an AI summary job.
4. Worker downloads the PDF, extracts text, cleans it, and optionally chunks it if large.
5. Worker sends the prepared content to the AI provider through an adapter.
6. Worker stores the generated summary in `ai_summaries`.
7. Workshop detail page shows the summary when ready.

## Key Design Decisions

- **Choice:** Background worker for text extraction and summarization.
  - **Why:** PDF parsing and AI calls are too slow and failure-prone for the request path.
  - **Trade-offs / risks:** Summary appears asynchronously rather than immediately.
  - **Alternatives not chosen:** Synchronous summarization during upload was rejected because it would cause long waits and timeouts.

- **Choice:** Store the original PDF in object storage and only metadata in PostgreSQL.
  - **Why:** Binary files do not belong in the relational database for this use case.
  - **Trade-offs / risks:** Requires separate storage configuration and cleanup policy.
  - **Alternatives not chosen:** Storing file blobs directly in PostgreSQL was rejected because it complicates scaling and backup size.

## Error Scenarios

- PDF is unreadable or corrupted: mark document processing failed and let organizer re-upload.
- AI provider timeout: retry a limited number of times and keep status `failed` or `retrying`.
- Extracted text is empty: mark summary as failed with an explicit reason.
- AI output is too long or low quality: organizer may manually trigger regeneration or edit the displayed text if the project chooses to allow editing.

## Constraints

- Summary generation must not block workshop creation or browsing.
- Only organizers can upload or replace workshop PDFs.
- The system should keep processing status visible to organizers: `uploaded`, `processing`, `ready`, `failed`.
- The displayed summary should be tied to a specific uploaded document version to avoid ambiguity.

## Acceptance Criteria

- Organizer can upload a PDF and see processing status.
- A successful job produces a summary shown on the workshop detail page.
- PDF or AI failure affects only the summary feature, not registration or browsing.
- Re-uploading a document creates a new processing attempt without corrupting prior audit history.
