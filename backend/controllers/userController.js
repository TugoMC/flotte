// controllers/userController.js
const User = require('../models/userModel');
const Driver = require('../models/driverModel');
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
        const { username, email, password, firstName, lastName, role = 'driver', phoneNumber, licenseNumber } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
        }

        // Vérifier si l'utilisateur est un admin
        if (role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "L'inscription en tant qu'admin n'est pas autorisée"
            });
        }

        // Créer l'utilisateur
        const user = await User.create({
            username,
            password,
            email,
            firstName,
            lastName,
            role
        });

        if (!user) {
            return res.status(400).json({ message: 'Informations utilisateur invalides' });
        }

        // Si l'utilisateur est un chauffeur, créer un enregistrement Driver associé
        if (role === 'driver') {
            // Vérifier que les champs requis pour le chauffeur sont fournis
            if (!phoneNumber || !licenseNumber) {
                return res.status(400).json({
                    message: 'Pour un chauffeur, le numéro de téléphone et le numéro de permis sont requis'
                });
            }

            // Vérifier si un chauffeur avec ce numéro de permis existe déjà
            const driverExists = await Driver.findOne({ licenseNumber });
            if (driverExists) {
                // Supprimer l'utilisateur créé si le chauffeur existe déjà
                await User.deleteOne({ _id: user._id });
                return res.status(400).json({ message: 'Un chauffeur avec ce numéro de permis existe déjà' });
            }

            // Créer le chauffeur associé
            const driver = await Driver.create({
                firstName,
                lastName,
                phoneNumber,
                licenseNumber,
                hireDate: new Date(),
                user: user._id
            });

            // Mettre à jour l'utilisateur avec la référence au chauffeur
            user.driver = driver._id;
            await user.save();

            // Populer les informations du driver avant de les renvoyer
            const populatedUser = await User.findById(user._id)
                .populate('driver')
                .select('-password');

            return res.status(201).json({
                _id: populatedUser._id,
                username: populatedUser.username,
                email: populatedUser.email,
                firstName: populatedUser.firstName,
                lastName: populatedUser.lastName,
                role: populatedUser.role,
                driver: populatedUser.driver,
                token: generateToken(populatedUser._id)
            });
        }

        // Pour les autres rôles (non-driver)
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Connexion utilisateur

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (user && (await user.matchPassword(password))) {
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
            res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
        }
    } catch (error) {
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

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDriverDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'driver',
                populate: {
                    path: 'currentVehicle',
                    select: 'type brand model licensePlate'
                }
            })
            .select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (!user.driver) {
            return res.status(403).json({ message: 'Accès réservé aux chauffeurs' });
        }

        res.json({
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            },
            driverDetails: user.driver,
            assignedVehicle: user.driver.currentVehicle
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateDriverUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Mettre à jour uniquement les champs autorisés
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;

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
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};