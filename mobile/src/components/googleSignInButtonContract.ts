
export interface GoogleSignInButtonProps {

  readonly onPress: () => void;


  readonly onStart: () => void;


  readonly onSettle: () => void;


  readonly onError: (message: string) => void;


  readonly disabled: boolean;


  readonly busy: boolean;
}
