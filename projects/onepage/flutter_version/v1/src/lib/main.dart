import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:universal_html/html.dart' as html;
import 'dart:io' show File, Platform;
import 'package:flutter/foundation.dart' show kIsWeb;


class EditorState with ChangeNotifier {
  String _text = '';
  TextSelection _selection = const TextSelection.collapsed(offset: 0);
  double _scrollOffset = 0.0;

  // Getters
  String get text => _text;
  TextSelection get selection => _selection;
  double get scrollOffset => _scrollOffset;

  // Setters with notifications
  void setText(String value) {
    _text = value;
    notifyListeners();
  }

  void setSelection(TextSelection value) {
    _selection = value;
    notifyListeners();
  }

  void setScrollOffset(double value) {
    _scrollOffset = value;
    notifyListeners();
  }

  // Serialization methods for Hive storage
  Map<String, dynamic> toMap() {
    return {
      'text': _text,
      'selectionStart': _selection.start,
      'selectionEnd': _selection.end,
      'scrollOffset': _scrollOffset,
    };
  }

  void fromMap(Map<String, dynamic> map) {
    _text = map['text'] ?? '';
    _selection = TextSelection(
      baseOffset: map['selectionStart'] ?? 0,
      extentOffset: map['selectionEnd'] ?? 0,
    );
    _scrollOffset = map['scrollOffset'] ?? 0.0;
    notifyListeners();
  }
}


void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('app_data');

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppSettings()),
        ChangeNotifierProvider(create: (_) => EditorState()),
      ],
      child: const OnePageApp(),
    ),
  );
}


class AppSettings with ChangeNotifier {
  static const List<Color> predefinedColors = [
    Colors.blue,
    Colors.red,
    Colors.green,
    Colors.orange,
  ];

  bool _isDarkMode = true; // Changed default to dark mode
  Color _accentColor = Colors.blue;
  double _fontSize = 24.0;
  String _fontFamily = 'Fira Code';
  double _lineSpacing = 1.2;
  double _margins = 16.0;
  TextAlign _textAlignment = TextAlign.left;
  bool _isItalic = false;
  bool _isBold = false;

  // Getters
  bool get isDarkMode => _isDarkMode;
  Color get accentColor => _accentColor;
  double get fontSize => _fontSize;
  String get fontFamily => _fontFamily;
  double get lineSpacing => _lineSpacing;
  double get margins => _margins;
  TextAlign get textAlignment => _textAlignment;
  bool get isItalic => _isItalic;
  bool get isBold => _isBold;

  void setCustomAccentColor(Color color) {
    _accentColor = color;
    notifyListeners();
  }

  // Font families list
  static List<String> availableFonts = [
    'Fira Code',
    'Roboto Mono',
    'Montserrat',
    'Noto Sans',
    'Titillium Web',
    'Source Code Pro',

  ];

  // Setters
  void setDarkMode(bool value) {
    _isDarkMode = value;
    notifyListeners();
  }

  void setAccentColor(Color color) {
    _accentColor = color;
    notifyListeners();
  }

  void setFontSize(double size) {
    _fontSize = size;
    notifyListeners();
  }

  void setFontFamily(String font) {
    _fontFamily = font;
    notifyListeners();
  }

  void setLineSpacing(double spacing) {
    _lineSpacing = spacing;
    notifyListeners();
  }

  void setMargins(double value) {
    _margins = value;
    notifyListeners();
  }

  void setTextAlignment(TextAlign alignment) {
    _textAlignment = alignment;
    notifyListeners();
  }

  void setItalic(bool value) {
    _isItalic = value;
    notifyListeners();
  }

  void setBold(bool value) {
    _isBold = value;
    notifyListeners();
  }

  Map<String, dynamic> toMap() {
    return {
      'isDarkMode': _isDarkMode,
      'accentColor': _accentColor.value,
      'fontSize': _fontSize,
      'fontFamily': _fontFamily,
      'lineSpacing': _lineSpacing,
      'margins': _margins,
      'textAlignment': _textAlignment.index,
      'isItalic': _isItalic,
      'isBold': _isBold,
    };
  }

  void fromMap(Map<String, dynamic> map) {
    _isDarkMode = map['isDarkMode'] ?? true;
    _accentColor = Color(map['accentColor'] ?? Colors.blue.value);
    _fontSize = map['fontSize'] ?? 16.0;
    _fontFamily = map['fontFamily'] ?? 'Fira Code';
    _lineSpacing = map['lineSpacing'] ?? 1.2;
    _margins = map['margins'] ?? 24.0;
    _textAlignment = TextAlign.values[map['textAlignment'] ?? 0];
    _isItalic = map['isItalic'] ?? false;
    _isBold = map['isBold'] ?? false;
    notifyListeners();
  }
}

// Rest of the EditorState class remains the same...

class OnePageApp extends StatelessWidget {
  const OnePageApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettings>();

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'One Page',
      theme: ThemeData(
        snackBarTheme: SnackBarThemeData(
          backgroundColor: settings.isDarkMode
              ? Colors.grey[900]
              : Colors.white,
          contentTextStyle: TextStyle(
            color: settings.isDarkMode ? Colors.white : settings.accentColor,
          ),

        ),
        brightness: settings.isDarkMode ? Brightness.dark : Brightness.light,
        primaryColor: settings.accentColor,
        fontFamily: settings.fontFamily,
        appBarTheme: AppBarTheme(
          backgroundColor: settings.isDarkMode
              ? Colors.grey[900]
              : settings.accentColor.withOpacity(0.1),
          elevation: 1,
          iconTheme: IconThemeData(color: settings.accentColor),
        ),
      ),
      home: const HomePage(),
    );
  }
}

class SettingsDialog extends StatelessWidget {
  final VoidCallback onSettingsChanged;
  final Function(String) onTextChanged;

  const SettingsDialog({
    super.key,
    required this.onSettingsChanged,
    required this.onTextChanged,
  });

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettings>();
    final isDark = settings.isDarkMode;

    // Get screen size
    final Size screenSize = MediaQuery.of(context).size;

    // Calculate maximum dimensions (80% of screen)
    final double maxWidth = screenSize.width * 0.8;
    final double maxHeight = screenSize.height * 0.8;

    // Calculate ideal width based on screen size
    final double dialogWidth = screenSize.width < 600
        ? screenSize.width * 0.95  // Mobile devices
        : min(500.0, maxWidth);    // Desktop/tablet

    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: dialogWidth,
          maxHeight: maxHeight,
        ),
        child: Container(
          width: dialogWidth,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(Icons.settings, color: settings.accentColor),
                    const SizedBox(width: 8),
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Theme section
                        _buildSectionHeader('Theme', Icons.palette, settings.accentColor),
                        SwitchListTile(
                          title: const Text('Dark Mode'),
                          secondary: Icon(
                            isDark ? Icons.dark_mode : Icons.light_mode,
                            color: settings.accentColor,
                          ),
                          value: settings.isDarkMode,
                          onChanged: (value) {
                            settings.setDarkMode(value);
                            onSettingsChanged();
                          },
                        ),

                        // Font section
                        _buildSectionHeader('Typography', Icons.text_fields, settings.accentColor),

                        // Font size slider
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            children: [
                              const Text('Size: '),
                              Expanded(
                                child: Slider(
                                  value: settings.fontSize,
                                  min: 12,
                                  max: 64,
                                  divisions: 52,
                                  label: settings.fontSize.round().toString(),
                                  onChanged: (value) {
                                    settings.setFontSize(value);
                                    onSettingsChanged();
                                  },
                                ),
                              ),
                              Text('${settings.fontSize.round()}'),
                            ],
                          ),
                        ),

                        // Font style toggles
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            ChoiceChip(
                              label: const Text('Bold'),
                              selected: settings.isBold,
                              onSelected: (value) {
                                settings.setBold(value);
                                onSettingsChanged();
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Italic'),
                              selected: settings.isItalic,
                              onSelected: (value) {
                                settings.setItalic(value);
                                onSettingsChanged();
                              },
                            ),
                          ],
                        ),

                        // Font family dropdown with preview
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: DropdownButtonFormField<String>(
                            decoration: InputDecoration(
                              labelText: 'Font Family',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            value: settings.fontFamily,
                            items: AppSettings.availableFonts.map((font) {
                              return DropdownMenuItem(
                                value: font,
                                child: Text(font, style: GoogleFonts.getFont(font)),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) {
                                settings.setFontFamily(value);
                                onSettingsChanged();
                              }
                            },
                          ),
                        ),

                        // Line spacing and alignment
                        _buildSectionHeader('Layout', Icons.format_line_spacing, settings.accentColor),

                        ListTile(
                          title: const Text('Line Spacing'),
                          trailing: DropdownButton<double>(
                            value: settings.lineSpacing,
                            items: [1.0, 1.2, 1.5, 1.8, 2.0].map((spacing) {
                              return DropdownMenuItem(
                                value: spacing,
                                child: Text('${spacing}x'),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) {
                                settings.setLineSpacing(value);
                                onSettingsChanged();
                              }
                            },
                          ),
                        ),

                        ListTile(
                          title: const Text('Text Alignment'),
                          trailing: DropdownButton<TextAlign>(
                            value: settings.textAlignment,
                            items: [
                              TextAlign.left,
                              TextAlign.center,
                              TextAlign.right,
                              TextAlign.justify
                            ].map((align) {
                              return DropdownMenuItem(
                                value: align,
                                child: Icon(
                                  _getAlignmentIcon(align),
                                  color: settings.accentColor,
                                ),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) {
                                settings.setTextAlignment(value);
                                onSettingsChanged();
                              }
                            },
                          ),
                        ),

                        // Color picker
                        _buildSectionHeader('Colors', Icons.color_lens, settings.accentColor),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          children: [
                            ...AppSettings.predefinedColors.map((color) => InkWell(
                              onTap: () {
                                settings.setAccentColor(color);
                                onSettingsChanged();
                              },
                              child: Container(
                                width: 40,
                                height: 40,
                                margin: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: color,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: settings.accentColor == color
                                        ? Colors.white
                                        : Colors.transparent,
                                    width: 2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: color.withOpacity(0.3),
                                      blurRadius: 4,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                ),
                              ),
                            )),
                            // Custom color picker button
                            InkWell(
                              onTap: () async {
                                // Show color picker dialog
                                final Color? color = await showDialog(
                                  context: context,
                                  builder: (BuildContext context) => AlertDialog(
                                    title: const Text('Pick a color'),
                                    content: SingleChildScrollView(
                                      child: ColorPicker(
                                        pickerColor: settings.accentColor,
                                        onColorChanged: (Color color) {
                                          settings.setCustomAccentColor(color);
                                          onSettingsChanged();
                                        },
                                        enableAlpha: false,
                                        displayThumbColor: true,
                                        labelTypes: [],
                                        pickerAreaHeightPercent: 0.8,
                                      ),
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.of(context).pop(),
                                        child: const Text('Done'),
                                      ),
                                    ],
                                  ),
                                );
                                if (color != null) {
                                  settings.setCustomAccentColor(color);
                                  onSettingsChanged();
                                }
                              },
                              child: Container(
                                width: 40,
                                height: 40,
                                margin: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.grey),
                                  gradient: const SweepGradient(
                                    colors: [...AppSettings.predefinedColors],
                                  ),
                                ),
                                child: const Icon(Icons.add, color: Colors.white),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Data management section
                        _buildSectionHeader('Data Management', Icons.storage, settings.accentColor),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'App Data',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: settings.accentColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _exportData(context),
                                      icon: const Icon(Icons.upload_file, size: 18),
                                      label: const Text('Export'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _importData(context),
                                      icon: const Icon(Icons.download, size: 18),
                                      label: const Text('Import'),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Text Only',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: settings.accentColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _exportTextOnly(context),
                                      icon: const Icon(Icons.text_snippet, size: 18),
                                      label: const Text('Export'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _importTextOnly(context),
                                      icon: const Icon(Icons.text_snippet, size: 18),
                                      label: const Text('Import'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Reset button
                        ElevatedButton.icon(
                          onPressed: () => _showResetConfirmation(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          icon: const Icon(Icons.restore),
                          label: const Text('Reset App'),
                        ),

                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, iconColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: iconColor),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Expanded(
            child: Divider(indent: 8),
          ),
        ],
      ),
    );
  }

  Widget _buildDataButton(
      BuildContext context,
      String label,
      IconData icon,
      VoidCallback onPressed,
      ) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
    );
  }

  IconData _getAlignmentIcon(TextAlign align) {
    switch (align) {
      case TextAlign.left:
        return Icons.format_align_left;
      case TextAlign.center:
        return Icons.format_align_center;
      case TextAlign.right:
        return Icons.format_align_right;
      case TextAlign.justify:
        return Icons.format_align_justify;
      default:
        return Icons.format_align_left;
    }
  }

  Future<void> _exportData(BuildContext context) async {
    try {
      final box = Hive.box('app_data');
      final data = {
        'settings': box.get('settings'),
        'editor_state': box.get('editor_state'),
      };
      final jsonString = jsonEncode(data);

      if (kIsWeb) {
        // Web platform export
        final bytes = utf8.encode(jsonString);
        final blob = html.Blob([bytes]);
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement()
          ..href = url
          ..download = 'onepage_backup.json'
          ..style.display = 'none';

        html.document.body?.append(anchor);
        anchor.click();
        html.Url.revokeObjectUrl(url);
        anchor.remove();
      } else {
        // Desktop/Mobile platform export
        final result = await FilePicker.platform.saveFile(
          dialogTitle: 'Save backup file',
          fileName: 'onepage_backup.json',
          type: FileType.custom,
          allowedExtensions: ['json'],
        );

        if (result != null) {
          await File(result).writeAsString(jsonString);
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data exported successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error exporting data: $e')),
      );
    }
  }
  Future<void> _importTextOnly(BuildContext context) async {
    try {
      String text;

      if (kIsWeb) {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['txt'],
          withData: true,
        );

        if (result == null || result.files.isEmpty) return;

        final bytes = result.files.first.bytes;
        if (bytes == null) return;

        text = utf8.decode(bytes);
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['txt'],
        );

        if (result == null || result.files.isEmpty) return;
        final file = File(result.files.first.path!);
        text = await file.readAsString();
      }

      // Update editor state with new text
      final editorState = context.read<EditorState>();
      editorState.setText(text);
      await Hive.box('app_data').put('editor_state', editorState.toMap());

      // Update text using the callback
      onTextChanged(text);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Text imported successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error importing text: $e')),
      );
    }
  }


  Future<void> _importData(BuildContext context) async {
    try {
      String jsonString;

      if (kIsWeb) {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['json'],
          withData: true,
        );

        if (result == null || result.files.isEmpty) return;

        final bytes = result.files.first.bytes;
        if (bytes == null) return;

        jsonString = utf8.decode(bytes);
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['json'],
        );

        if (result == null || result.files.isEmpty) return;
        final file = File(result.files.first.path!);
        jsonString = await file.readAsString();
      }

      final data = jsonDecode(jsonString) as Map<String, dynamic>;

      // Update settings
      if (data['settings'] != null) {
        context.read<AppSettings>().fromMap(
          Map<String, dynamic>.from(data['settings']),
        );
        await Hive.box('app_data').put('settings', data['settings']);
      }

      // Update editor state
      if (data['editor_state'] != null) {
        final editorState = context.read<EditorState>();
        editorState.fromMap(Map<String, dynamic>.from(data['editor_state']));
        await Hive.box('app_data').put('editor_state', data['editor_state']);

        // Update text using the callback
        onTextChanged(editorState.text);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data imported successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error importing data: $e')),
      );
    }
  }


  Future<void> _exportTextOnly(BuildContext context) async {
    try {
      final editorState = context.read<EditorState>();
      final text = editorState.text;

      if (kIsWeb) {
        // Web platform text export
        final bytes = utf8.encode(text);
        final blob = html.Blob([bytes]);
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement()
          ..href = url
          ..download = 'onepage_text.txt'
          ..style.display = 'none';

        html.document.body?.append(anchor);
        anchor.click();
        html.Url.revokeObjectUrl(url);
        anchor.remove();
      } else {
        // Desktop/Mobile platform text export
        final result = await FilePicker.platform.saveFile(
          dialogTitle: 'Export Text',
          fileName: 'onepage_text.txt',
          type: FileType.custom,
          allowedExtensions: ['txt'],
        );

        if (result != null) {
          await File(result).writeAsString(text);
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Text exported successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error exporting text: $e')),
      );
    }
  }

  void _showResetConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset App'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: Colors.amber,
              size: 48,
            ),
            SizedBox(height: 16),
            Text(
              'Are you sure you want to reset all settings and data? This action cannot be undone.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              // Clear all data from Hive
              final box = Hive.box('app_data');
              box.clear();

              // Reset both providers to default values
              context.read<AppSettings>().fromMap({});
              context.read<EditorState>().fromMap({});

              // Clear the text using the callback
              onTextChanged('');

              // Close both dialogs
              Navigator.of(context).pop(); // Close confirmation dialog
              Navigator.of(context).pop(); // Close settings dialog
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }

}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  HomePageState createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  void updateTextController(String text) {
    setState(() {
      _textController.text = text;
    });
  }

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _textController = TextEditingController();
  late final Box _box;

  @override
  void initState() {
    super.initState();
    _box = Hive.box('app_data');
    _loadSavedData();
    _setupControllers();
  }

  void _loadSavedData() {
    final settings = context.read<AppSettings>();
    final editorState = context.read<EditorState>();

    final savedSettings = _box.get('settings');
    if (savedSettings != null) {
      settings.fromMap(Map<String, dynamic>.from(savedSettings));
    }

    final savedState = _box.get('editor_state');
    if (savedState != null) {
      editorState.fromMap(Map<String, dynamic>.from(savedState));
      _textController.text = editorState.text;
      _textController.selection = editorState.selection;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.jumpTo(editorState.scrollOffset);
      });
    }
  }

  void _setupControllers() {
    final editorState = context.read<EditorState>();

    _scrollController.addListener(() {
      editorState.setScrollOffset(_scrollController.offset);
      _saveEditorState();
    });

    _textController.addListener(() {
      editorState.setText(_textController.text);
      editorState.setSelection(_textController.selection);
      _saveEditorState();
    });
  }

  void _saveEditorState() {
    final editorState = context.read<EditorState>();
    _box.put('editor_state', editorState.toMap());
  }

  void _saveSettings() {
    final settings = context.read<AppSettings>();
    _box.put('settings', settings.toMap());
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettings>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'One Page',
          style: GoogleFonts.getFont(settings.fontFamily,
              fontWeight: FontWeight.bold,
              fontStyle: settings.isItalic ? FontStyle.italic : FontStyle.normal,
              color: settings._accentColor,
            fontSize: 30,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showSettingsDialog(),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Padding(
              padding: EdgeInsets.all(settings.margins),
              child: TextField(
                controller: _textController,
                scrollController: _scrollController,
                autofocus: true,
                maxLines: null,
                style: GoogleFonts.getFont(settings.fontFamily,
                  fontWeight: settings.isBold ? FontWeight.bold : FontWeight.normal,
                  fontStyle: settings.isItalic ? FontStyle.italic : FontStyle.normal,
                  height: settings.lineSpacing,
                  fontSize: settings.fontSize,
                ),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                ),
                textAlign: settings.textAlignment,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: settings.isDarkMode
                  ? Colors.grey[900]
                  : Colors.grey[100],
              border: Border(
                top: BorderSide(
                  color: settings.isDarkMode
                      ? Colors.grey[800]!
                      : Colors.grey[300]!,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Made by '),
                MouseRegion(
                  cursor: SystemMouseCursors.click,
                  child: GestureDetector(
                    onTap: () async {
                      final Uri url = Uri.parse('https://github.com/samar1h');
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url);
                      }
                    },
                    child: Row(
                      children: [
                        Container(
                          width: 15,
                          height: 15,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: settings.accentColor)
                          ),
                          child: Image.asset("assets/images/github-mark.png"),
                        ),
                        Text(
                          ' samar1h',
                          style: TextStyle(
                            color: settings.accentColor,
                          ),
                        ),
                      ],
                    )
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => SettingsDialog(
        onSettingsChanged: _saveSettings,
        onTextChanged: (String newText) {
          setState(() {
            _textController.text = newText;
          });
        },
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _textController.dispose();
    super.dispose();
  }
}