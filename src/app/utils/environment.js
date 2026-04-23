// Environment configuration
// ⚠️ This file should be added to .gitignore to keep secrets out of version control

export const config = {
  webhook: {
    url: 'https://api-prod.letsdeel.com/zendesk-iframe/requester-info',
    // Authentication headers for the external webhook API
    // Add your authentication headers here
    authHeaders: {
      'x-internal-tools-integration-id': 'bb082555-3314-49ad-9617-afb2b6d14453',
      'x-internal-tools-auth-key': 'f9243842bf635d80eb43b90214faa39b3b0d9e5750d89ece9a194381cecbb8c3',
    }
  }
};