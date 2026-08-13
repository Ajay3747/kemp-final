// Manual acceptance test for the local person-detection model.
//
// The automated suite (npm test) stubs this model out for speed and
// determinism — this script runs the REAL model against a REAL photo you
// provide, so you can verify actual detection behavior end to end.
//
// Usage:
//   node scripts/test-person-detection.js path/to/photo.jpg
//
// Run it once with a plain product photo (expect "No person detected —
// image would be ALLOWED") and once with a photo containing a person
// (expect "Person detected — image would be REJECTED"), matching the
// acceptance cases in the task spec (product-only, face, full body,
// multiple people).

const fs = require('fs');
const path = require('path');
const { detectPersons } = require('../src/services/imageModeration/localPersonDetector');
const { PERSON_CONFIDENCE_THRESHOLD } = require('../src/services/imageModeration/config');

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: node scripts/test-person-detection.js path/to/photo.jpg');
    process.exit(1);
  }

  const resolvedPath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(resolvedPath);

  console.log(`Analyzing ${resolvedPath} ...`);
  console.log(`(first run downloads the ~7MB COCO-SSD model — needs internet, may take a few seconds)`);
  console.log(`PERSON_CONFIDENCE_THRESHOLD = ${PERSON_CONFIDENCE_THRESHOLD}`);
  console.log('');

  const started = Date.now();
  const result = await detectPersons(buffer);
  const elapsedMs = Date.now() - started;

  if (!result.ok) {
    console.error(`Detection FAILED (${result.errorType}): ${result.message}`);
    process.exit(1);
  }

  console.log(`Raw detections (all confidences, ${elapsedMs}ms):`, result.detections);

  const humanDetected = result.detections.some((d) => d.confidence >= PERSON_CONFIDENCE_THRESHOLD);

  console.log('');
  if (humanDetected) {
    console.log(`RESULT: Person detected — image would be REJECTED.`);
  } else {
    console.log(`RESULT: No person detected — image would be ALLOWED.`);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
