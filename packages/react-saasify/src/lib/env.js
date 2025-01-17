import qs from 'qs'

const isProd = (process.env.NODE_ENV === 'production')
const suffix = (isProd ? 'PRD' : 'DEV')

const prodGithubRedirectUri = `${window.location.origin}/auth/github`
const prodGithubRedirectQuery = qs.stringify({ uri: prodGithubRedirectUri })

export default {
  providerGitHubClientId: process.env[`REACT_APP_PROVIDER_GITHUB_CLIENT_ID_${suffix}`],
  stripePublicKey: isProd
    ? process.env.REACT_APP_STRIPE_PUBLIC_KEY_LIVE
    : process.env.REACT_APP_STRIPE_PUBLIC_KEY_TEST,
  githubRedirectUri: isProd
    ? `https://auth.saasify.sh?${prodGithubRedirectQuery}`
    : 'http://localhost:3000/auth/github'
}
