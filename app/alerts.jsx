import Alerts from '../components/alerts';

export default function AlertsPage() {
  return <Alerts />;
}

// Hide the default header to match other pages
AlertsPage.options = {
  headerShown: false,
};
