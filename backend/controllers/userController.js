// controllers/userController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Générer JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Inscription d'un nouvel utilisateur
exports.register = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, role } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
        }

        // Vérifier le rôle (seul un admin peut créer un admin ou manager)
        if ((role === 'admin' || role === 'manager') && (!req.user || req.user.role !== 'admin')) {
            return res.status(403).json({ message: 'Non autorisé à créer ce type d\'utilisateur' });
        }

        // Créer l'utilisateur
        const user = await User.create({
            username,
            password,
            email,
            firstName,
            lastName,
            role: role || 'driver'
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Informations utilisateur invalides' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// Connexion utilisateur
// Dans userController.js, modifiez la fonction login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("Tentative de connexion pour:", username);

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ username });
        console.log("Utilisateur trouvé:", user ? "Oui" : "Non");

        if (user) {
            // Vérifier le mot de passe
            console.log("Vérification du mot de passe...");
            const isMatch = await user.matchPassword(password);
            console.log("Résultat de la comparaison du mot de passe:", isMatch);

            if (isMatch) {
                // Mettre à jour la date de dernière connexion
                user.lastLogin = Date.now();
                await user.save();

                res.json({
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    token: generateToken(user._id)
                });
            } else {
                console.log("Mot de passe incorrect");
                res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            }
        } else {
            console.log("Utilisateur non trouvé");
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
    } catch (error) {
        console.error("Erreur dans la fonction login:", error);
        res.status(500).json({ message: error.message });
    }
};

// Déconnexion utilisateur (côté serveur, nous ne pouvons pas invalider le token JWT)
// Mais nous pouvons mettre à jour la date de dernière connexion
exports.logout = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user._id);
            if (user) {
                user.lastLogin = Date.now();
                await user.save();
            }
        }
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir le profil de l'utilisateur actuel
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour le profil utilisateur
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.email = req.body.email || user.email;
            user.username = req.body.username || user.username;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                role: updatedUser.role,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Obtenir tous les utilisateurs (admin uniquement)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un utilisateur (admin uniquement)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Utiliser deleteOne au lieu de remove (qui est déprécié)
            await User.deleteOne({ _id: user._id });
            res.json({ message: 'Utilisateur supprimé' });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour le rôle d'un utilisateur (admin uniquement)
exports.updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.role = req.body.role || user.role;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                role: updatedUser.role
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Vérifier si le token est valide
exports.verifyToken = async (req, res) => {
    // Si on arrive ici, c'est que le middleware protect a déjà vérifié le token
    res.json({ valid: true, user: req.user });
};

// Changer le mot de passe d'un utilisateur
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier si le mot de passe actuel est correct
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
        }

        // Changer le mot de passe (le hachage sera fait automatiquement via le middleware pre-save)
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};