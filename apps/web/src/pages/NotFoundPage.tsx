import { Link } from 'react-router';
import { Page } from '../components/Page';
import { StatusMessage } from '../components/StatusMessage';

export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <StatusMessage title="Page not found">
        <Link to="/" className="button">
          Back to home
        </Link>
      </StatusMessage>
    </Page>
  );
}
