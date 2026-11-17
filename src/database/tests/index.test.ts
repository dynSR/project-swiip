import './suites/database-integrity.test.js';
import './suites/schema-constraints.test.js';
import './suites/discussion-lifecycle.test.js';
import './suites/deletion-rules.test.js';
import './suites/guild-configuration.test.js';

import '../../app/services/tests/discussion-lifecycle.service.test.js';
import '../../app/services/tests/decision-record.service.test.js';
import '../../app/services/tests/discussion-cleanup.service.test.js';
import '../../app/services/tests/decision-record-archive.service.test.js';
import '../../app/services/tests/discussion-participant.service.test.js';
import '../../app/services/tests/discussion-close.service.test.js';

import '../../app/components/tests/decision-record-archive.component.test.js';

import '../../shared/helpers/tests/text.helpers.test.js'