// src/components/ErrorBoundary.jsx
import { Component } from 'react';
import ErrorPage from '@/pages/Error/ErrorPage';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Met à jour l'état pour afficher l'interface de repli
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Vous pouvez également enregistrer l'erreur dans un service de rapport d'erreurs
        console.error("Error caught by ErrorBoundary:", error, errorInfo);
        this.setState({ errorInfo });

        // Ici, vous pourriez envoyer les détails de l'erreur à un service comme Sentry
        // if (typeof window.reportError === 'function') {
        //     window.reportError(error, errorInfo);
        // }
    }

    render() {
        if (this.state.hasError) {
            // Vous pouvez afficher n'importe quelle interface UI de repli
            return (
                <ErrorPage
                    code={500}
                    message="Une erreur inattendue s'est produite dans l'application."
                    details={this.state.error?.toString()}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;