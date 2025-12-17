/**
 * Window-related IPC channels
 */

import type { NoRequest, SuccessResponse } from "./types";

export interface WindowChannels {
	"window-create": {
		request: NoRequest;
		response: SuccessResponse;
	};

	"window-is-restored": {
		request: NoRequest;
		response: boolean;
	};

	"window-get-id": {
		request: NoRequest;
		response: string;
	};

	"window-focus": {
		request: { windowId: string };
		response: SuccessResponse;
	};
}
