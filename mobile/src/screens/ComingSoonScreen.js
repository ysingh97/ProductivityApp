import React from 'react';
import ScreenMessage from '../components/ScreenMessage';

// Placeholder for parity screens (Calendar, Visualizations) that will be built
// out in follow-up work. Keeps navigation structure aligned with the web app.
const ComingSoonScreen = ({ route }) => (
  <ScreenMessage
    message={`${route?.name || 'This screen'} is coming soon on mobile.`}
  />
);

export default ComingSoonScreen;
