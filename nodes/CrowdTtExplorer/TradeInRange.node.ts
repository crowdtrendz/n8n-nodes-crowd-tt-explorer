import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

export class TradeInRange implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crowd TT Explorer- Trade Range',
		name: 'tradeInRange',
		icon: 'file:crowd-tt3.png',
		group: ['transform'],
		version: 1,
		description: 'Filter trades within a specified time range from now',
		defaults: {
			name: 'Trade In Range',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Time Range',
				name: 'timeRange',
				type: 'options',
				options: [
					{
						name: '5 Minutes',
						value: '5m',
						description: 'Filter trades from the last 5 minutes',
					},
					{
						name: '15 Minutes',
						value: '15m',
						description: 'Filter trades from the last 15 minutes',
					},
					{
						name: '1 Hour',
						value: '1h',
						description: 'Filter trades from the last hour',
					},
					{
						name: '4 Hours',
						value: '4h',
						description: 'Filter trades from the last 4 hours',
					},
					{
						name: '24 Hours',
						value: '24h',
						description: 'Filter trades from the last 24 hours',
					},
					{
						name: '7 Days',
						value: '7d',
						description: 'Filter trades from the last 7 days',
					},
				],
				default: '5m',
				description: 'Select the time range to filter trades',
			},
			{
				displayName: 'Output Options',
				name: 'outputOptions',
				placeholder: 'Add Output Option',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'options',
						displayName: 'Output Options',
						values: [
							{
								displayName: 'Include Filter Info',
								name: 'includeFilterInfo',
								type: 'boolean',
								default: true,
								description: 'Whether to include filtering information in the output when no trades are found',
							},
							{
								displayName: 'Return Empty on No Results',
								name: 'returnEmptyOnNoResults',
								type: 'boolean',
								default: false,
								description: 'Return empty array instead of info message when no trades found',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get configuration parameters
		const timeRange = this.getNodeParameter('timeRange', 0) as string;
		const outputOptions = this.getNodeParameter('outputOptions.options', 0, {
			includeFilterInfo: true,
			returnEmptyOnNoResults: false,
		}) as {
			includeFilterInfo: boolean;
			returnEmptyOnNoResults: boolean;
		};

		// Helper function to calculate time threshold based on range
		function getTimeThreshold(range: string): number {
			const currentTime = Math.floor(Date.now() / 1000);

			switch (range) {
				case '5m':
					return currentTime - (5 * 60); // 5 minutes
				case '15m':
					return currentTime - (15 * 60); // 15 minutes
				case '1h':
					return currentTime - (60 * 60); // 1 hour
				case '4h':
					return currentTime - (4 * 60 * 60); // 4 hours
				case '24h':
					return currentTime - (24 * 60 * 60); // 24 hours
				case '7d':
					return currentTime - (7 * 24 * 60 * 60); // 7 days
				default:
					return currentTime - (5 * 60); // default to 5 minutes
			}
		}

		// Helper function to get human-readable time range description
		function getRangeDescription(range: string): string {
			switch (range) {
				case '5m':
					return 'last 5 minutes';
				case '15m':
					return 'last 15 minutes';
				case '1h':
					return 'last hour';
				case '4h':
					return 'last 4 hours';
				case '24h':
					return 'last 24 hours';
				case '7d':
					return 'last 7 days';
				default:
					return 'specified time range';
			}
		}

		// Calculate the time threshold
		const timeThreshold = getTimeThreshold(timeRange);
		const rangeDescription = getRangeDescription(timeRange);

		// Process each input item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			try {
				const trades = item.json;

				// Handle both single trade object and array of trades
				const tradesArray = Array.isArray(trades) ? trades : [trades];

				// Filter trades within the time range
				for (const trade of tradesArray) {
					// Check if trade has time field and if it's within the specified time range
					if (trade && typeof trade === 'object' && trade.time && trade.time >= timeThreshold) {
						returnData.push({
							json: trade,
							pairedItem: { item: itemIndex },
						});
					}
				}
			} catch (error) {
				// Handle errors gracefully
				throw new Error(`Error processing item ${itemIndex}: ${error.message}`);
			}
		}

		// Handle case when no trades are found
		if (returnData.length === 0) {
			if (outputOptions.returnEmptyOnNoResults) {
				// Return empty array
				return [[]];
			} else if (outputOptions.includeFilterInfo) {
				// Return info message
				const thresholdDate = new Date(timeThreshold * 1000).toISOString();
				return [[{
					json: {
						message: `No trades found in the ${rangeDescription}`,
						filteredAt: new Date().toISOString(),
						criteriaUsed: `Trades after ${thresholdDate}`,
						timeRange: timeRange,
						timeThreshold: timeThreshold,
					},
					pairedItem: { item: 0 },
				}]];
			} else {
				// Return empty array when includeFilterInfo is false
				return [[]];
			}
		}

		return [returnData];
	}
}