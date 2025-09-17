import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

export class WalletHistoryPrettify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crowd TT Explorer- Prettify',
		name: 'walletHistoryPrettify',
		icon: 'file:crowd-tt3.png',
		group: ['transform'],
		version: 1,
		description: 'Crowd TT Explorer- Utility Tool- Prettify: Parse and format wallet transaction timestamps into human-readable formats',
		defaults: {
			name: 'Wallet History Prettify',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Process Mode',
				name: 'processMode',
				type: 'options',
				options: [
					{
						name: 'All Transactions',
						value: 'all',
						description: 'Process all transactions in the input',
					},
					{
						name: 'First Transaction',
						value: 'first',
						description: 'Process only the first transaction',
					},
					{
						name: 'Last Transaction',
						value: 'last',
						description: 'Process only the last transaction',
					},
					{
						name: 'Latest by Time',
						value: 'latest_time',
						description: 'Process the transaction with the most recent timestamp',
					},
					{
						name: 'Earliest by Time',
						value: 'earliest_time',
						description: 'Process the transaction with the earliest timestamp',
					},
				],
				default: 'all',
				description: 'How to process the input transactions',
			},
			{
				displayName: 'Time Format Options',
				name: 'timeFormats',
				placeholder: 'Add Time Format',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'formats',
						displayName: 'Format Options',
						values: [
							{
								displayName: 'Include ISO Format',
								name: 'includeISO',
								type: 'boolean',
								default: true,
								description: 'Whether to include ISO 8601 format (e.g., 2023-12-01T10:30:00.000Z)',
							},
							{
								displayName: 'Include Local Format',
								name: 'includeLocal',
								type: 'boolean',
								default: true,
								description: 'Whether to include local date/time formats',
							},
							{
								displayName: 'Include UTC Format',
								name: 'includeUTC',
								type: 'boolean',
								default: true,
								description: 'Whether to include UTC string format',
							},
							{
								displayName: 'Include Custom Format',
								name: 'includeCustom',
								type: 'boolean',
								default: true,
								description: 'Whether to include custom readable format',
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
		const processMode = this.getNodeParameter('processMode', 0) as string;
		const timeFormatsConfig = this.getNodeParameter('timeFormats.formats', 0, {
			includeISO: true,
			includeLocal: true,
			includeUTC: true,
			includeCustom: true,
		}) as {
			includeISO: boolean;
			includeLocal: boolean;
			includeUTC: boolean;
			includeCustom: boolean;
		};

		// Helper function to parse time for a single transaction
		function parseTransactionTime(transaction: any) {
			const timestamp = transaction.time;
			const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds

			const timeFormats: any = {};

			if (timeFormatsConfig.includeISO) {
				timeFormats.iso = date.toISOString();
			}

			if (timeFormatsConfig.includeUTC) {
				timeFormats.utc = date.toUTCString();
			}

			if (timeFormatsConfig.includeLocal) {
				timeFormats.local = date.toLocaleString();
				timeFormats.dateOnly = date.toLocaleDateString();
				timeFormats.timeOnly = date.toLocaleTimeString();
			}

			if (timeFormatsConfig.includeCustom) {
				timeFormats.custom = date.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
				});
			}

			return {
				...transaction,
				originalTime: timestamp,
				parsedTime: timeFormats,
				readableTime: timeFormats.custom || timeFormats.local || timeFormats.iso,
			};
		}

		// Helper function to filter transactions based on mode
		function filterTransactions(transactions: any[], mode: string) {
			switch (mode) {
				case 'first':
					return [transactions[0]];

				case 'last':
					return [transactions[transactions.length - 1]];

				case 'latest_time':
					const latest = transactions.reduce((prev, current) =>
						prev.time > current.time ? prev : current,
					);
					return [latest];

				case 'earliest_time':
					const earliest = transactions.reduce((prev, current) =>
						prev.time < current.time ? prev : current,
					);
					return [earliest];

				case 'all':
				default:
					return transactions;
			}
		}

		// Process each input item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			try {
				// Extract transactions from the nested array structure
				let transactions;

				if (item.json && Array.isArray(item.json) && item.json[0] && Array.isArray(item.json[0])) {
					transactions = item.json[0]; // Structure: item.json[0]
				} else if (item.json && Array.isArray(item.json)) {
					transactions = item.json; // Structure: item.json
				} else {
					throw new Error(
						`Could not find transaction array in item ${itemIndex}. Structure: ${JSON.stringify(
							item,
						)}`,
					);
				}

				// Validate that we have transactions
				if (!Array.isArray(transactions) || transactions.length === 0) {
					throw new Error(`No transactions found in item ${itemIndex}`);
				}

				// Filter transactions based on processing mode
				const selectedTransactions = filterTransactions(transactions, processMode);

				// Parse time for selected transactions
				const processedTransactions = selectedTransactions.map(parseTransactionTime);

				// Add results to return data based on processing mode
				if (processMode === 'all') {
					// Add multiple items for 'all' mode
					processedTransactions.forEach((transaction) => {
						returnData.push({
							json: transaction,
							pairedItem: { item: itemIndex },
						});
					});
				} else {
					// Add single item for specific selection modes
					returnData.push({
						json: processedTransactions[0],
						pairedItem: { item: itemIndex },
					});
				}
			} catch (error) {
				// Handle errors gracefully
				throw new Error(`Error processing item ${itemIndex}: ${error.message}`);
			}
		}

		return [returnData];
	}
}