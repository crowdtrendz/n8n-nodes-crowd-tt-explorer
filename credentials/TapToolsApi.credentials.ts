import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TapToolsApi implements ICredentialType {
	name = 'tapToolsApi';
	displayName = 'Crowd TT API';
	documentationUrl = 'https://docs.taptools.io/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your TapTools API key',
		},
	];
}