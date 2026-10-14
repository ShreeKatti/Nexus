import solarWindsLogo from '../assets/integrations/solarwinds.png'
import catoLogo from '../assets/integrations/cato.png'
import site24x7Logo from '../assets/integrations/site24x7.png'
import microsoftSqlServerLogo from '../assets/integrations/microsoft-sql-server.png'
import mysqlLogo from '../assets/integrations/mysql.svg'
import postgresqlLogo from '../assets/integrations/postgresql.svg'
import prometheusLogo from '../assets/integrations/prometheus.svg'
import grafanaLogo from '../assets/integrations/grafana.svg'
import cloudWatchLogo from '../assets/integrations/cloudwatch.svg'

export const DATASOURCE_CARDS = [
    {
      name: 'SolarWinds SWIS API',
      logoUrl: solarWindsLogo,
      authType: 'basic',
      description: 'Connect to the SolarWinds Information Service (SWIS) API.',
      endpointLabel: 'Server URL',
      endpointPlaceholder: 'https://solarwinds.example.com',
      endpointHint: 'Enter only the scheme and host. Nexus uses the SWIS API on port 17774 automatically.',
    },
    {
      name: 'Cato',
      logoUrl: catoLogo,
      authType: 'cato',
      description: 'Connect to your Cato SASE account with your API URL, API key, account ID, and site IDs.',
      endpointLabel: 'API URL',
      endpointPlaceholder: 'https://api.catonetworks.com/api/v1/graphql2',
      endpointHint: 'Use the Cato API endpoint for your account and a read-only API key where possible.',
    },
    {
      name: 'Site24x7',
      logoUrl: site24x7Logo,
      authType: 'site24x7',
      description: 'Use the prefilled demo values for testing, or enter your Site24x7 OAuth access token.',
      endpointLabel: 'API URL',
      endpointPlaceholder: 'https://www.site24x7.com/api',
      endpointHint: 'Demo analysis reads seeded measurements from the Nexus database; no external Site24x7 request is made.',
    },
    {
      name: 'Microsoft SQL Server',
      logoUrl: microsoftSqlServerLogo,
      authType: 'basic',
      description: 'Connect to a Microsoft SQL Server database.',
      endpointLabel: 'Server',
      endpointPlaceholder: 'sql.example.com',
      endpointHint: 'Provide the SQL Server host name or IP address. Use a dedicated read-only account.',
    },
    {
      name: 'MySQL',
      logoUrl: mysqlLogo,
      authType: 'basic',
      description: 'Connect to a MySQL database with a dedicated read-only account.',
      endpointLabel: 'Server',
      endpointPlaceholder: 'mysql.example.com',
      endpointHint: 'Provide the MySQL host name or IP address.',
    },
    {
      name: 'PostgreSQL',
      logoUrl: postgresqlLogo,
      authType: 'basic',
      description: 'Connect to a PostgreSQL database with a dedicated read-only account.',
      endpointLabel: 'Server',
      endpointPlaceholder: 'postgres.example.com',
      endpointHint: 'Provide the PostgreSQL host name or IP address.',
    },
    {
      name: 'Prometheus',
      logoUrl: prometheusLogo,
      authType: 'basic',
      description: 'Connect to a Prometheus server to query metrics.',
      endpointLabel: 'Server URL',
      endpointPlaceholder: 'http://prometheus.example.com:9090',
      endpointHint: 'Enter the base URL for your Prometheus server.',
    },
    {
      name: 'Grafana',
      logoUrl: grafanaLogo,
      authType: 'basic',
      description: 'Connect to a Grafana instance and import dashboard metadata.',
      endpointLabel: 'Grafana URL',
      endpointPlaceholder: 'https://grafana.example.com',
      endpointHint: 'Enter the base URL of your Grafana instance.',
    },
    {
      name: 'AWS CloudWatch',
      logoUrl: cloudWatchLogo,
      authType: 'basic',
      description: 'Connect to AWS CloudWatch to bring cloud metrics into Nexus.',
      endpointLabel: 'AWS endpoint',
      endpointPlaceholder: 'https://monitoring.ap-south-1.amazonaws.com',
      endpointHint: 'Use the CloudWatch endpoint for your AWS region.',
    },
]

export const getProviderLogo = (providerName) => {
  const logoMap = {
    'Cato': catoLogo,
    'Site24x7': site24x7Logo,
    'SolarWinds SWIS API': solarWindsLogo,
    'Solarwinds': solarWindsLogo,
    'Microsoft SQL Server': microsoftSqlServerLogo,
    'MySQL': mysqlLogo,
    'PostgreSQL': postgresqlLogo,
    'Prometheus': prometheusLogo,
    'Grafana': grafanaLogo,
    'AWS CloudWatch': cloudWatchLogo,
  }
  return logoMap[providerName] || logoMap[providerName?.split(' ')[0]]
}
