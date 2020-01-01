/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import Dap from '../../dap/api';

export async function launchUnelevatedChrome(
  dap: Dap.Api,
  chromePath: string,
  chromeArgs: string[],
): Promise<number> {
  // TODO: Timeout after 10 secs
  const response: any = await (dap as any).launchUnelevatedRequest({
    process: chromePath,
    args: chromeArgs,
  });

  return response.processId;
}
