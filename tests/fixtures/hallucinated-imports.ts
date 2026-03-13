// Test fixture for hallucinated package detection
// This file contains imports that don't exist in npm registry

// These should be detected as hallucinated (fake packages)
import { fakeUtil } from 'super-amazing-ai-utility-9999';
import { nonExistent } from 'this-package-definitely-does-not-exist-xyz';
import hallucinated from 'ai-generated-fake-library';

// These are real packages and should NOT be flagged
import express from 'express';
import lodash from 'lodash';
import { useState } from 'react';

// Relative imports should be ignored
import { helper } from './utils';
import config from '../config';

export { fakeUtil, nonExistent, express };
