// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from 'path';
import * as utils from '../../common/urlUtils';
import { ISourcePathResolverOptions, SourcePathResolverBase } from '../sourcePathResolver';

interface IOptions extends ISourcePathResolverOptions {
  baseUrl?: string;
  webRoot?: string;
}

export class BrowserSourcePathResolver extends SourcePathResolverBase<IOptions> {
  constructor(options: IOptions) {
    super({
      ...options,
      webRoot: utils.platformPathToPreferredCase(
        options.webRoot ? path.normalize(options.webRoot) : undefined,
      ),
    });
  }

  absolutePathToUrl(absolutePath: string): string | undefined {
    const { baseUrl, webRoot } = this.options;

    absolutePath = path.normalize(absolutePath);
    // Note: we do not check that absolutePath belongs to basePath to
    // allow source map sources reference outside of web root.
    if (!baseUrl || !webRoot) return utils.absolutePathToFileUrl(absolutePath);
    const relative = path.relative(webRoot, absolutePath);
    return utils.completeUrlEscapingRoot(baseUrl, utils.platformPathToUrlPath(relative));
  }

  urlToAbsolutePath(url: string): string {
    const { baseUrl, webRoot } = this.options;

    const absolutePath = utils.fileUrlToAbsolutePath(url);
    if (absolutePath) return absolutePath;

    if (!webRoot) {
      return '';
    }

    const unmappedPath = this.applyPathOverrides(url);
    if (unmappedPath !== url) {
      return path.resolve(webRoot, unmappedPath);
    }

    if (!baseUrl || !url.startsWith(baseUrl)) return '';
    url = utils.urlPathToPlatformPath(url.substring(baseUrl.length));
    if (url === '' || url === '/') url = 'index.html';
    return path.join(webRoot, url);
  }
}
