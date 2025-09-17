import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

export class CrowdTtExplorer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crowd TT Explorer',
		name: 'crowdTtExplorer',
		icon: 'file:crowd-tt1.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with TT API',
		defaults: {
			name: 'Crowd TT Explorer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'tapToolsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Wallet Token Trades',
						value: 'getWalletTokenTrades',
						description: 'Get token trades for a wallet address',
						action: 'Get wallet token trades',
					},
				],
				default: 'getWalletTokenTrades',
			},
			{
				displayName: 'Wallet Address',
				name: 'address',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'stake1...',
				description: 'The stake wallet address to query',
				displayOptions: {
					show: {
						operation: ['getWalletTokenTrades'],
					},
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				displayOptions: {
					show: {
						operation: ['getWalletTokenTrades'],
					},
				},
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				default: 10,
				description: 'Number of results per page',
				displayOptions: {
					show: {
						operation: ['getWalletTokenTrades'],
					},
				},
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'string',
				default: '',
				description: 'Unit parameter (optional)',
				displayOptions: {
					show: {
						operation: ['getWalletTokenTrades'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('tapToolsApi');

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'getWalletTokenTrades') {
					const address = this.getNodeParameter('address', i) as string;
					const page = this.getNodeParameter('page', i) as number;
					const perPage = this.getNodeParameter('perPage', i) as number;
					const unit = this.getNodeParameter('unit', i) as string;

					const queryParams: Record<string, string> = {
						address,
						page: page.toString(),
						perPage: perPage.toString(),
					};

					if (unit) {
						queryParams.unit = unit;
					}

					const queryString = Object.entries(queryParams)
						.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
						.join('&');

					const options = {
						method: 'GET' as const,
						url: `https://openapi.taptools.io/api/v1/wallet/trades/tokens?${queryString}`,
						headers: {
							'x-api-key': credentials.apiKey as string,
							'Content-Type': 'application/json',
						},
						json: true,
					};

					const response = await this.helpers.request(options);

					returnData.push({
						json: response,
						pairedItem: {
							item: i,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}