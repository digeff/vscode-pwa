// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { testUsing } from '../fixtures/testUsing';
import { TestProjectSpec } from '../framework/frameworkTestSupport';
import { LaunchProject } from '../fixtures/launchProject';
import { onUnhandledException, onHandledError } from '../utils/onUnhandledException';
import { promiseDefer, promiseTimeout } from '../testUtils';
import { IChromeLaunchConfiguration } from '../../configuration';

const waitForTestResult = promiseDefer();

testUsing(
  'No unhandled exceptions when we parse invalid JavaScript code. We get a handled error',
  context =>
    LaunchProject.launch(
      context,
      TestProjectSpec.fromTestPath('featuresTests/invalidJavaScriptCode'),
      {} as IChromeLaunchConfiguration,
      {
        registerListeners: client => {
          // We fail the test if we get an unhandled exception
          onUnhandledException(client, exceptionMessage =>
            waitForTestResult.reject(exceptionMessage),
          );
          // We expect to get a handled error instead
          onHandledError(client, async errorMessage => {
            if (errorMessage.startsWith(`SyntaxError: Unexpected token 'function'`)) {
              // After we get the message, we wait 1 more second to verify we don't get any unhandled exceptions, and then we succeed the test
              await promiseTimeout(undefined, 1000 /* 1 sec */);

              waitForTestResult.resolve();
            }
          });
        },
      },
    ),
  async _launchProject => {
    await waitForTestResult.promise;
  },
);
