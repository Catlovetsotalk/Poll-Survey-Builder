using System.Security.Cryptography;

namespace Backend.Services;

public interface ICodeGenerator
{
    string Generate(int length = 6);
}

public class CodeGenerator : ICodeGenerator
{
    private const string Alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public string Generate(int length = 6)
    {
        var chars = new char[length];
        var bytes = RandomNumberGenerator.GetBytes(length);
        for (var i = 0; i < length; i++)
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        return new string(chars);
    }
}