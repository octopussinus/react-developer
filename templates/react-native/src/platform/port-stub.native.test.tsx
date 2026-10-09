import { render, screen } from '@testing-library/react-native';
import { PortStub } from './port-stub';

describe('PortStub', () => {
  it('names the route and the file still to translate', async () => {
    await render(<PortStub path="/orders/:id" page="src/modules/orders/detail/detail-page.tsx" />);

    expect(screen.getByText('/orders/:id')).toBeOnTheScreen();
    expect(screen.getByText(/detail-page\.tsx/)).toBeOnTheScreen();
  });
});
