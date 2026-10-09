import { render, screen, userEvent } from '@testing-library/react-native';
import { Button } from './button';

describe('Button', () => {
  it('presses, and wraps a string label in Text (RN throws on bare strings)', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Save</Button>);

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is announced busy and ignores presses while loading', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <Button isLoading onPress={onPress}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
